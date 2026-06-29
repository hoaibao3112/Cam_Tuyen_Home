import { Controller, Get, Param, BadRequestException } from '@nestjs/common'
import axios from 'axios'

@Controller('locations')
export class LocationController {
  @Get('provinces')
  async getProvinces() {
    try {
      const response = await axios.get('https://esgoo.net/api-tinhthanh/1/0.htm')
      return response.data
    } catch (err: any) {
      throw new BadRequestException('Không thể lấy danh sách tỉnh thành: ' + err.message)
    }
  }

  @Get('districts/:provinceId')
  async getDistricts(@Param('provinceId') provinceId: string) {
    try {
      const response = await axios.get(`https://esgoo.net/api-tinhthanh/2/${provinceId}.htm`)
      return response.data
    } catch (err: any) {
      throw new BadRequestException('Không thể lấy danh sách quận huyện: ' + err.message)
    }
  }

  @Get('wards/:districtId')
  async getWards(@Param('districtId') districtId: string) {
    try {
      const response = await axios.get(`https://esgoo.net/api-tinhthanh/3/${districtId}.htm`)
      return response.data
    } catch (err: any) {
      throw new BadRequestException('Không thể lấy danh sách phường xã: ' + err.message)
    }
  }
}
