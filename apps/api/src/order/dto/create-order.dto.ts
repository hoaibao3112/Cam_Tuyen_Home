import { IsString, IsArray, IsOptional, IsNotEmpty, ValidateNested, IsNumber, Min, IsUUID } from 'class-validator'
import { Type } from 'class-transformer'

export class OrderItemDto {
  @IsUUID()
  menu_item_id: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsNumber()
  @Min(0)
  price: number

  @IsNumber()
  @Min(1)
  quantity: number
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  shop_slug: string

  @IsString()
  @IsNotEmpty()
  customer_name: string

  @IsString()
  @IsNotEmpty()
  customer_phone: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[]

  @IsOptional()
  @IsString()
  note?: string

  @IsOptional()
  @IsString()
  address_province?: string

  @IsString()
  @IsNotEmpty()
  address_district: string

  @IsString()
  @IsNotEmpty()
  address_ward: string

  @IsOptional()
  @IsString()
  address_street?: string
}

